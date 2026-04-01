namespace Loupedeck.Test6Plugin
{
    using System;
    using System.Timers;

    internal class ResetWithoutAdjustmentActionEditorDynamicCommand : ActionEditorCommand
    {
        private readonly Timer _timer = new Timer(1_000);
        private Int32 _count = 0;

        public ResetWithoutAdjustmentActionEditorDynamicCommand()
        {
            this.Name = this.GetType().Name;
            this.DisplayName = "Reset without adjustment (action editor)";
            this.GroupName = "Test";

            this.ActionEditor.AddControlEx(new ActionEditorHidden("hidden"));
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

        protected override Boolean RunCommand(ActionEditorActionParameters actionParameters)
        {
            this._count = 0;
            this.ActionImageChanged();
            return true;
        }

        protected override String GetCommandDisplayName(ActionEditorActionParameters actionParameters) => $"Reset AE\r\n{this._count:N0}";

        private void OnTimerElapsed(Object sender, ElapsedEventArgs e)
        {
            this._count++;
            this.ActionImageChanged();
        }
    }
}