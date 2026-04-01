namespace Loupedeck.Test6Plugin
{
    using System;

    internal class PluginEvent2DynamicCommand : PluginDynamicCommand
    {
        private const String EventName = "periodic2";

        private readonly System.Timers.Timer _periodicEventTimer = new();

        public PluginEvent2DynamicCommand()
            : base("Plugin events (periodic)", "Invokes plugin event every 2 seconds", "Test")
        {
        }

        protected override Boolean OnLoad()
        {
            this.Plugin.PluginEvents.AddEvent(EventName, "Every 2 seconds", "This event is sent every 2 seconds");

            this._periodicEventTimer.AutoReset = true;
            this._periodicEventTimer.Interval = 2_000;
            this._periodicEventTimer.Elapsed += this.OnPeriodicEventTimerElapsed;

            return true;
        }

        protected override Boolean OnUnload()
        {
            this._periodicEventTimer.Stop();
            this._periodicEventTimer.Elapsed -= this.OnPeriodicEventTimerElapsed;

            return true;
        }

        protected override void RunCommand(String actionParameter)
        {
            this._periodicEventTimer.Enabled = !this._periodicEventTimer.Enabled;

            this.ActionImageChanged();
        }

        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize) => this._periodicEventTimer.Enabled ? "Plugin events ON" : "Plugin events OFF";

        private void OnPeriodicEventTimerElapsed(Object sender, System.Timers.ElapsedEventArgs e) => this.Plugin.PluginEvents.RaiseEvent(EventName);
    }
}