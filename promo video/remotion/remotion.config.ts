/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import { enableTailwind } from '@remotion/tailwind-v4';

// PNG frames + low CRF: the sources are crisp UI recordings — JPEG frame
// compression visibly softens text.
Config.setVideoImageFormat("png");
Config.setCrf(15);
Config.setOverwriteOutput(true);
Config.overrideWebpackConfig(enableTailwind);
