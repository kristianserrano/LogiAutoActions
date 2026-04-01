namespace Loupedeck.Test4Plugin
{
    using System;
    using System.Collections.Generic;

    public class Adjustment3WithRenamedReset : PluginDynamicAdjustment
    {
        private readonly Dictionary<String, Int32> _levels = new Dictionary<String, Int32>();
        private readonly Dictionary<String, Boolean>  _isMuted = new Dictionary<String, Boolean>();

        public Adjustment3WithRenamedReset() : base(true)
        {
            this.DisplayName = "(3) Volume Change";
            this.GroupName = "Test";
            this.Description = "An example adjustment with a renamed 'reset' command";

            for (var channelNumber = 1; channelNumber <= 4; channelNumber++)
            {
                var parameterName = $"{channelNumber}";
                this.AddParameter(parameterName, $"(3) Channel {channelNumber} volume", this.GroupName);
                this._levels[parameterName] = 50;
                this._isMuted[parameterName] = false;
            }

            this.MakeProfileAction("list");
        }

        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize) => $"(3) Mute channel {actionParameter}";

        protected override void ApplyAdjustment(String actionParameter, Int32 ticks)
        {
            var level = this._levels[actionParameter] + ticks;
            level = Helpers.MinMax(level, 0, 100); // level can be between 0 and 100

            if (level != this._levels[actionParameter])
            {
                this._levels[actionParameter] = level;
                this.AdjustmentValueChanged(actionParameter);
            }
        }

        protected override void RunCommand(String actionParameter)
        {
            this._isMuted[actionParameter] = !this._isMuted[actionParameter];
            this.AdjustmentValueChanged(actionParameter);
        }

        protected override String GetAdjustmentValue(String actionParameter) => this._isMuted[actionParameter] ? "x" : this._levels[actionParameter].ToString();
    }
}
