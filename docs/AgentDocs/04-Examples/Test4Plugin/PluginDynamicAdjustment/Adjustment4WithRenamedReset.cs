namespace Loupedeck.Test4Plugin
{
    using System;
    using System.Collections.Generic;

    public class Adjustment4WithRenamedReset : PluginDynamicAdjustment
    {
        private readonly Dictionary<String, Int32> _levels = new Dictionary<String, Int32>();

        public Adjustment4WithRenamedReset() : base(true)
        {
            this.DisplayName = "(4) Volume Change";
            this.GroupName = "Test";
            this.Description = "An example adjustment with a renamed 'reset' command";

            this.MakeProfileAction("text");
        }

        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize) => $"(4) Mute {actionParameter}";

        protected override void ApplyAdjustment(String actionParameter, Int32 ticks)
        {
            this.AddIfDoesNotExist(actionParameter);

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
            this._levels[actionParameter] = 50;
            this.AdjustmentValueChanged(actionParameter);
        }

        protected override String GetAdjustmentValue(String actionParameter)
        {
            this.AddIfDoesNotExist(actionParameter);
            return this._levels[actionParameter].ToString();
        }

        private void AddIfDoesNotExist(String actionParameter)
        {
            if (!this._levels.ContainsKey(actionParameter))
            {
                this._levels[actionParameter] = 50;
            }
        }
    }
}
