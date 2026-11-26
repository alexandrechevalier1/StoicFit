package expo.modules.clocktimer

import android.content.Intent
import android.provider.AlarmClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Lance un minuteur dans l'application Horloge du téléphone : il continue
// et sonne même si StoicFit est fermée.
class ClockTimerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ClockTimer")

    // Renvoie false si aucune application Horloge ne gère l'intention.
    Function("startTimer") { seconds: Int, message: String ->
      val context = appContext.reactContext ?: return@Function false
      val intent = Intent(AlarmClock.ACTION_SET_TIMER).apply {
        putExtra(AlarmClock.EXTRA_LENGTH, seconds)
        putExtra(AlarmClock.EXTRA_MESSAGE, message)
        putExtra(AlarmClock.EXTRA_SKIP_UI, true)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      try {
        context.startActivity(intent)
        true
      } catch (e: Exception) {
        false
      }
    }
  }
}
