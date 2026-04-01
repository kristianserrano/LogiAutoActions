namespace Loupedeck.Test6Plugin
{
    public partial class Test6Plugin : Plugin
    {
        private readonly System.Timers.Timer _periodicEventTimer = new();

        public override Boolean UsesApplicationApiOnly => true;

        public override Boolean HasNoApplication => true;

        public override void Load()
        {
            this._periodicEventTimer.AutoReset = true;
            this._periodicEventTimer.Interval = 60_000;
            this._periodicEventTimer.Elapsed += this.OnPeriodicEventTimerElapsed;
            this._periodicEventTimer.Start();
        }

        public override void Unload()
        {
            this._periodicEventTimer.Stop();
            this._periodicEventTimer.Elapsed -= this.OnPeriodicEventTimerElapsed;
        }

        private void OnPeriodicEventTimerElapsed(Object sender, System.Timers.ElapsedEventArgs e) => this.PluginEvents.RaiseEvent("periodic60");
    }
}