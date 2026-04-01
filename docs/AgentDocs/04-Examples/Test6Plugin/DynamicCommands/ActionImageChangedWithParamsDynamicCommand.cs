namespace Loupedeck.Test6Plugin
{
    using System;
    using System.Timers;

    internal class ActionImageChangedWithParamsDynamicCommand : PluginDynamicCommand
    {
        private readonly Timer _timer = new Timer(1_000);
        private Int32 _count = 0;

        public ActionImageChangedWithParamsDynamicCommand()
        {
            this.DisplayName = "ActionImageChanged / WithParams";
            this.GroupName = "Test";

            for (var i = 0; i < 3; i++)
            {
                this.AddParameter($"{i}", $"ActionImageChanged / WithParams / {i}", this.GroupName);
            }
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

        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize) => $"Param{actionParameter}:\r\n{this._count:N0}";

        private void OnTimerElapsed(Object sender, ElapsedEventArgs e)
        {
            this._count++;
            this.ActionImageChanged();
        }
    }
}