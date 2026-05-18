/**
 * App entry point – immediately redirects to the welcome screen.
 *
 * Using <Redirect> (not router.replace in a useEffect) so the
 * navigation happens synchronously as part of the render tree,
 * before expo-router's "navigator not mounted" guard fires.
 */

import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/welcome" />;
}
