namespace Loupedeck.Test4Plugin
{
    using System;

    public class AutoRepeatOnLongPressCommand1 : PluginDynamicCommand
    {
        private Int32 _counter = 0;

        public AutoRepeatOnLongPressCommand1()
            : base("Auto-repeat 1", "", "Auto-repeat On Long Press")
            => this.AutoRepeatOnLongPress = true;

        protected override void RunCommand(String actionParameter)
        {
            this._counter++;
            this.ActionImageChanged(actionParameter);
        }

        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize) => $"N={this._counter}";
    }
}
