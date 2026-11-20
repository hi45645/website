import { cache } from "react";
import { getPublicSettings } from "@/lib/settings";

export const readPublicSettings = cache(getPublicSettings);
