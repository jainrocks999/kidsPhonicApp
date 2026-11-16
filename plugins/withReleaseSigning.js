/**
 * Signs local Gradle release builds (`./gradlew assembleRelease|bundleRelease`) with the
 * upload keystore described in `credentials.json` — the same file EAS uses for
 * `credentialsSource: "local"`, so local and EAS builds share one key.
 *
 * `android/` is generated, so the signing config is appended on every prebuild. The
 * secrets are read from `credentials.json` at Gradle build time and never written into
 * `android/`. Without `credentials.json` the release build keeps the template's debug key.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// @generated release-signing (plugins/withReleaseSigning.js)';

const SNIPPET = `
${MARKER}
def releaseCredentialsFile = new File(rootDir, "../credentials.json")
def releaseKeystore = releaseCredentialsFile.exists()
    ? new groovy.json.JsonSlurper().parse(releaseCredentialsFile)?.android?.keystore
    : null
if (releaseKeystore != null) {
    android {
        signingConfigs {
            release {
                storeFile new File(rootDir, "../" + releaseKeystore.keystorePath)
                storePassword releaseKeystore.keystorePassword
                keyAlias releaseKeystore.keyAlias
                keyPassword releaseKeystore.keyPassword
            }
        }
        buildTypes {
            release {
                signingConfig = signingConfigs.release
            }
        }
    }
} else {
    logger.warn("release-signing: credentials.json not found - release builds are signed with the DEBUG key")
}
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('withReleaseSigning: android/app/build.gradle must be Groovy');
    }
    if (!mod.modResults.contents.includes(MARKER)) {
      mod.modResults.contents += SNIPPET;
    }
    return mod;
  });
};
