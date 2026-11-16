import type { ConfigContext } from 'expo/config';
import monetization from './monetization.config.json';

const ADS_PLUGIN = 'react-native-google-mobile-ads';

export default ({ config }: ConfigContext) => ({
  ...config,
  plugins: (config.plugins ?? []).map((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    if (name !== ADS_PLUGIN) return plugin;
    return [
      ADS_PLUGIN,
      {
        androidAppId: monetization.admob.androidAppId,
        iosAppId: monetization.admob.iosAppId,
        // Kids app: no measurement before the child-directed request configuration is set.
        delayAppMeasurementInit: true,
      },
    ] as [string, Record<string, string | boolean>];
  }),
});
