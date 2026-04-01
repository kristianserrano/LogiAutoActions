namespace Loupedeck.Test6Plugin
{
    using System;
    using System.Timers;

    public class PluginStatusBlinkDynamicCommand : PluginDynamicCommand
    {
        private readonly Timer _timer = new Timer(1_000);
        private Boolean _state = false;

        public PluginStatusBlinkDynamicCommand() : base("Blink!", "", "Plugin Status")
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

        private void OnTimerElapsed(Object sender, ElapsedEventArgs e)
        {
            this._state = !this._state;
            var pluginStatus = this._state ? PluginStatus.Error : PluginStatus.Warning;
            this.Plugin.OnPluginStatusChanged(pluginStatus, $"Plugin status changed to {pluginStatus}", "https://loupedeck.com", "Change status");
        }
    }
}
