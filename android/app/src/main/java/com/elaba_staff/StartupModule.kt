package com.elaba_staff

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class StartupModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "StartupModule"

  @ReactMethod
  fun markReactReady() {
    MainActivity.reactNavigationReady = true
  }
}
