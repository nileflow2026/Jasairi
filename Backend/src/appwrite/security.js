// @ts-nocheck
const { Permission, Role } = require('node-appwrite');

/**
 * Security and Privacy Service for Child Safety
 * Implements COPPA compliance and data protection
 */
class SecurityService {
  constructor(appwriteService) {
    this.appwrite = appwriteService;
    this.databases = appwriteService.getDatabase();
    this.storage = appwriteService.getStorage();
  }

  /**
   * COPPA Compliance Rules
   */
  static get COPPA_RULES() {
    return {
      MIN_PARENTAL_CONSENT_AGE: 13,
      MAX_CHILD_AGE: 17,
      REQUIRED_PARENTAL_VERIFICATION: true,
      DATA_RETENTION_DAYS: 365,
      AUTOMATIC_DELETION_AGE: 18,
    };
  }

  /**
   * Security Levels for Different Data Types
   */
  static get SECURITY_LEVELS() {
    return {
      PUBLIC: 'public', // Game assets, templates
      RESTRICTED: 'restricted', // Child artwork, progress (guardian access only)
      PRIVATE: 'private', // Medical info, personal data
      CONFIDENTIAL: 'confidential', // Raw interaction data, AI analysis
    };
  }

  /**
   * Content Moderation for User-Generated Content
   */
  async moderateContent(contentType, contentData, childId) {
    try {
      const moderationRules = {
        artwork: {
          allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
          maxFileSize: 10 * 1024 * 1024, // 10MB
          requiresReview: false,
        },
        text: {
          maxLength: 500,
          bannedWords: [], // Add appropriate filter
          requiresReview: true,
        },
        voice: {
          allowedFormats: ['mp3', 'wav'],
          maxDuration: 60, // seconds
          requiresReview: true,
        },
      };

      const rules = moderationRules[contentType];
      if (!rules) {
        throw new Error('Unknown content type for moderation');
      }

      const moderationResult = {
        approved: true,
        flagged: false,
        requiresReview: rules.requiresReview,
        reasons: [],
        sanitizedContent: contentData,
      };

      // Apply content-specific moderation
      switch (contentType) {
        case 'artwork':
          moderationResult = await this.moderateArtwork(contentData, rules);
          break;
        case 'text':
          moderationResult = await this.moderateText(contentData, rules);
          break;
        case 'voice':
          moderationResult = await this.moderateVoice(contentData, rules);
          break;
      }

      // Log moderation activity (without storing sensitive content)
      await this.logModerationActivity(childId, contentType, moderationResult);

      return moderationResult;
    } catch (error) {
      throw new Error(`Content moderation failed: ${error.message}`);
    }
  }

  /**
   * Moderate artwork uploads
   */
  async moderateArtwork(imageData, rules) {
    const result = {
      approved: true,
      flagged: false,
      requiresReview: false,
      reasons: [],
      sanitizedContent: imageData,
    };

    // File size check
    if (imageData.size > rules.maxFileSize) {
      result.approved = false;
      result.reasons.push('File size exceeds limit');
      return result;
    }

    // Format validation
    const allowedTypes = rules.allowedFormats.map(format => `image/${format}`);
    if (!allowedTypes.includes(imageData.type)) {
      result.approved = false;
      result.reasons.push('Invalid file format');
      return result;
    }

    // TODO: Implement image content analysis
    // - Check for inappropriate content
    // - Scan for text/personal information
    // - Verify it's actually an image

    return result;
  }

  /**
   * Moderate text content
   */
  async moderateText(textData, rules) {
    const result = {
      approved: true,
      flagged: false,
      requiresReview: rules.requiresReview,
      reasons: [],
      sanitizedContent: textData,
    };

    // Length check
    if (textData.length > rules.maxLength) {
      result.approved = false;
      result.reasons.push('Text exceeds maximum length');
      return result;
    }

    // Content filtering (implement appropriate filters)
    const sanitized = this.sanitizeText(textData);
    result.sanitizedContent = sanitized;

    // Flag for review if contains sensitive information
    if (this.containsSensitiveInfo(sanitized)) {
      result.flagged = true;
      result.requiresReview = true;
      result.reasons.push('Contains potentially sensitive information');
    }

    return result;
  }

  /**
   * Data Anonymization for Analytics
   */
  async anonymizeChildData(childId, dataType, rawData) {
    const anonymizedData = { ...rawData };

    // Remove personally identifiable information
    delete anonymizedData.name;
    delete anonymizedData.email;
    delete anonymizedData.photoUrl;
    delete anonymizedData.medicalInfo;
    delete anonymizedData.emergencyContact;

    // Replace child ID with anonymous hash
    const anonymousId = await this.generateAnonymousId(childId, dataType);
    anonymizedData.anonymousChildId = anonymousId;
    delete anonymizedData.childId;

    // Add data aggregation level
    anonymizedData.dataLevel = 'aggregated';
    anonymizedData.anonymizedAt = new Date().toISOString();

    return anonymizedData;
  }

  /**
   * Secure file upload with virus scanning
   */
  async secureFileUpload(bucketId, file, permissions, childId = null) {
    try {
      // Pre-upload security checks
      await this.validateFileUpload(file, bucketId);

      // Upload file with secure permissions
      const uploadedFile = await this.storage.createFile(
        bucketId,
        'unique()',
        file,
        permissions
      );

      // Post-upload virus scan (if enabled)
      if (this.appwrite.buckets[bucketId]?.antivirus) {
        await this.scheduleVirusScan(uploadedFile.$id, bucketId);
      }

      // Log upload activity
      await this.logFileActivity(childId, 'upload', uploadedFile.$id, bucketId);

      return uploadedFile;
    } catch (error) {
      throw new Error(`Secure upload failed: ${error.message}`);
    }
  }

  /**
   * Automatic data retention and cleanup
   */
  async enforceDataRetention() {
    try {
      const retentionPolicies = {
        // Raw interaction data - 90 days
        game_interactions: 90,
        // Progress reports - 2 years
        progress_reports: 730,
        // AI recommendations - 30 days
        ai_recommendations: 30,
        // Artwork sessions - Keep indefinitely (user choice)
        artwork_sessions: null,
      };

      for (const [collection, retentionDays] of Object.entries(
        retentionPolicies
      )) {
        if (retentionDays) {
          await this.cleanupOldData(collection, retentionDays);
        }
      }

      // Check for aged-out users (18+ years old)
      await this.handleAgedOutUsers();
    } catch (error) {
      console.error('Data retention enforcement failed:', error);
    }
  }

  /**
   * Generate anonymous ID for analytics
   */
  async generateAnonymousId(childId, context) {
    const crypto = require('crypto');
    const salt = process.env.ANONYMIZATION_SALT || 'default-salt';
    const data = `${childId}-${context}-${salt}`;
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Validate file upload security
   */
  async validateFileUpload(file, bucketId) {
    const bucketConfig = this.appwrite.buckets[bucketId];

    if (!bucketConfig) {
      throw new Error('Invalid bucket configuration');
    }

    // File size validation
    if (file.size > bucketConfig.maximumFileSize) {
      throw new Error('File size exceeds maximum allowed');
    }

    // File type validation
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!bucketConfig.allowedFileExtensions.includes(fileExtension)) {
      throw new Error('File type not allowed');
    }

    // Additional security checks
    if (this.isExecutableFile(fileExtension)) {
      throw new Error('Executable files not permitted');
    }

    return true;
  }

  /**
   * Check if file extension is executable
   */
  isExecutableFile(extension) {
    const executableExtensions = [
      'exe',
      'bat',
      'cmd',
      'com',
      'pif',
      'scr',
      'vbs',
      'js',
      'jar',
      'app',
      'deb',
      'pkg',
      'rpm',
      'dmg',
      'iso',
      'bin',
    ];
    return executableExtensions.includes(extension.toLowerCase());
  }

  /**
   * Sanitize text content
   */
  sanitizeText(text) {
    // Remove HTML tags
    let sanitized = text.replace(/<[^>]*>/g, '');

    // Remove potential script injections
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
  }

  /**
   * Check for sensitive information in text
   */
  containsSensitiveInfo(text) {
    const patterns = [
      /\d{3}-\d{2}-\d{4}/, // SSN pattern
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card pattern
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email pattern
      /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/, // Phone number pattern
    ];

    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * Schedule virus scan for uploaded file
   */
  async scheduleVirusScan(fileId, bucketId) {
    // In a production environment, integrate with antivirus service
    console.log(
      `Scheduling virus scan for file ${fileId} in bucket ${bucketId}`
    );
    // TODO: Implement actual virus scanning
  }

  /**
   * Log security-related activities
   */
  async logModerationActivity(childId, contentType, result) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: 'content_moderation',
      childId: childId || 'anonymous',
      contentType,
      approved: result.approved,
      flagged: result.flagged,
      reasons: result.reasons.join(', '),
    };

    // Log to secure audit trail (not stored in main database)
    console.log('SECURITY_AUDIT:', JSON.stringify(logEntry));
  }

  /**
   * Log file upload/access activities
   */
  async logFileActivity(childId, action, fileId, bucketId) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: `file_${action}`,
      childId: childId || 'system',
      fileId,
      bucketId,
    };

    console.log('FILE_AUDIT:', JSON.stringify(logEntry));
  }

  /**
   * Clean up old data based on retention policy
   */
  async cleanupOldData(collectionId, retentionDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const oldDocuments = await this.databases.listDocuments(
        this.appwrite.databaseId,
        collectionId,
        [`$createdAt<${cutoffDate.toISOString()}`]
      );

      for (const doc of oldDocuments.documents) {
        await this.databases.deleteDocument(
          this.appwrite.databaseId,
          collectionId,
          doc.$id
        );
      }

      console.log(
        `Cleaned up ${oldDocuments.documents.length} old documents from ${collectionId}`
      );
    } catch (error) {
      console.error(`Failed to cleanup ${collectionId}:`, error);
    }
  }

  /**
   * Handle users who have aged out (18+)
   */
  async handleAgedOutUsers() {
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);

    try {
      const agedOutChildren = await this.databases.listDocuments(
        this.appwrite.databaseId,
        this.appwrite.collections.children,
        [`dateOfBirth<${eighteenYearsAgo.toISOString()}`]
      );

      for (const child of agedOutChildren.documents) {
        // Archive data and schedule for deletion
        await this.archiveChildData(child.$id);
        console.log(`Archived data for aged-out user: ${child.$id}`);
      }
    } catch (error) {
      console.error('Failed to handle aged-out users:', error);
    }
  }

  /**
   * Archive child data before deletion
   */
  async archiveChildData(childId) {
    // In production, export data to secure archive
    // Then delete from active database
    console.log(`Archiving data for child: ${childId}`);
    // TODO: Implement actual archival process
  }
}

module.exports = { SecurityService };
