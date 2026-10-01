package com.elaba_staff

import android.content.Intent
import com.facebook.react.ReactActivity
import android.os.Bundle
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

class MainActivity : ReactActivity() {

  companion object {
    @Volatile
    var reactNavigationReady = false
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "eLaba_staff"

  override fun onCreate(savedInstanceState: Bundle?) {
    reactNavigationReady = false
    val splashScreen = installSplashScreen()
    splashScreen.setKeepOnScreenCondition { !reactNavigationReady }
    super.onCreate(savedInstanceState)
  }

  fun markReactReady() {
    reactNavigationReady = true
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
  }
}
