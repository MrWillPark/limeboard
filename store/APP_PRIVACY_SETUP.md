# App Privacy questionnaire (App Store Connect)

Apple does **not** expose the privacy label API on the public App Store Connect API key.
Complete this in the ASC web UI, or upload via Fastlane with an Apple ID session.

## Recommended answers for LimeBoard

**Do you or your third-party partners collect data from this app?**  
→ **Yes**

Then declare these data types (all **linked to the user**, **not used for tracking**):

| Data type | Purpose | Linked to user | Tracking |
|-----------|---------|----------------|----------|
| **Email Address** | App Functionality | Yes | No |
| **User ID** | App Functionality | Yes | No |
| **Purchase History** | App Functionality | Yes | No |

**Do not declare** OpenRouter API keys — they stay on-device and are sent only to OpenRouter, not LimeBoard servers.

**Third-party data collection:** RevenueCat (subscription verification), Supabase (auth). No ads or analytics SDKs.

### ASC path

1. [App Store Connect](https://appstoreconnect.apple.com/apps/6805714980/distribution/privacy) → **App Privacy**
2. Get Started / Edit
3. Add the three types above with purposes **App Functionality**
4. For each: **Data Linked to You**, not used for tracking
5. Save and **Publish**

## Optional: Fastlane upload

If you have Fastlane and an Apple ID with ASC access:

```bash
brew install fastlane
fastlane run upload_app_privacy_details_to_app_store \
  username:YOUR_APPLE_ID \
  app_identifier:app.limeboard.mobile \
  json_path:store/app-privacy-details.json
```

The JSON matches [Fastlane’s format](https://docs.fastlane.tools/uploading-app-privacy-details/).
