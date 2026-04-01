namespace Loupedeck.Test4Plugin
{
    using System;

    public class Adjustment1WithRenamedReset : PluginDynamicAdjustment
    {
        private Int32 _level = 0;
        private Boolean _isMuted = false;

        public Adjustment1WithRenamedReset() : base("Fake Volume", "An example adjustment with a renamed 'reset' command", "Test", true)
        {
        }

        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize) => "Mute Fake Volume";

        protected override void ApplyAdjustment(String actionParameter, Int32 ticks)
        {
            var level = this._level + ticks;
            level = Helpers.MinMax(level, 0, 100); // level can be between 0 and 100

            if (level != this._level)
            {
                this._level = level;
                this.AdjustmentValueChanged();
            }
        }

        protected override void RunCommand(String actionParameter)
        {
            this._isMuted = !this._isMuted;
            this.AdjustmentValueChanged();
        }

        protected override String GetAdjustmentValue(String actionParameter) => this._isMuted ? "x" : this._level.ToString();
    }
}
