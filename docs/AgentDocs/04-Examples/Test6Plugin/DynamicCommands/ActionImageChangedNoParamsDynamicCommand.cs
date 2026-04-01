namespace Loupedeck.Test6Plugin
{
    using System;
    using System.Timers;

    internal class ActionImageChangedNoParamsDynamicCommand : PluginDynamicCommand
    {
        private readonly Timer _timer = new Timer(1_000);
        private Int32 _count = 0;

        public ActionImageChangedNoParamsDynamicCommand()
            : base("ActionImageChanged / NoParams", "", "Test")
        {
        }

        protected override Boolean OnLoad()
        {
            this._timer.Elapsed += this.OnTimerElapsed;
            this._timer.Enabled = true;
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
            this._count = 0;
            this.ActionImageChanged();
        }

        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize) => $"NoParams:\r\n{this._count:N0}";

        private void OnTimerElapsed(Object sender, ElapsedEventArgs e)
        {
            this._count++;
            this.ActionImageChanged();
        }
    }
}