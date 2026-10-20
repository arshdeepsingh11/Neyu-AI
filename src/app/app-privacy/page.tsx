// /app-privacy — the old phone-app notice (linked from Health Connect and the app stores).
// Its content is now the "NEYU phone app" section of the Privacy Policy.
import { permanentRedirect } from "next/navigation";

export default function AppPrivacy() {
  permanentRedirect("/privacy#app");
}
