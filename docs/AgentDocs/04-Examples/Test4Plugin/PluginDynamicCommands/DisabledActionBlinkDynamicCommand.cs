namespace Loupedeck.Test4Plugin
{
    using System;
    using System.Timers;

    public class DisabledActionBlinkDynamicCommand : PluginDynamicCommand
    {
        private readonly Timer _timer = new Timer(1_000);

        public DisabledActionBlinkDynamicCommand() : base("Enable Blink!", "", "Test")
        {
        }

        protected override Boolean OnLoad()
        {
            this._timer.Elapsed += this.OnTimerElapsed;
            return true;
        }

        protected override Boolean OnUnload()
        {
            this._timer.Enabled = false;
            this._timer.Elapsed -= this.OnTimerElapsed;
            return true;
        }

        protected override void RunCommand(String actionParameter)
        {
            this._timer.Enabled = !this._timer.Enabled;
            this.ActionImageChanged();
        }

        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize) => this._timer.Enabled ? "Stop blinking" : "Start blinking";

        private void OnTimerElapsed(Object sender, ElapsedEventArgs e) => this.IsEnabled = !this.IsEnabled;
    }
}
