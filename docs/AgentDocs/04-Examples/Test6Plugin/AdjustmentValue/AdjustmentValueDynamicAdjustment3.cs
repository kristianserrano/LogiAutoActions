namespace Loupedeck.Test6Plugin
{
    using System;

    internal class AdjustmentValueDynamicAdjustment3 : PluginDynamicAdjustment
    {
        private readonly Dictionary<String, Double> _counters = new Dictionary<String, Double>();

        public AdjustmentValueDynamicAdjustment3()
            : base(true)
        {
            // create 3 action parameters
            for (var i = 1; i <= 3; i++)
            {
                var actionParameter = $"{i}";
                this._counters[actionParameter] = this.GetAdjustmentDefaultValue(actionParameter).GetValueOrDefault();

                var parameter = this.AddParameter(actionParameter, $"Adjustment Value 3 / {i}", "Adjustment Value");
                parameter.Description = $"Adjustment Value 3 / {i} description";
            }
        }

        protected override void ApplyAdjustment(String actionParameter, Int32 ticks)
        {
            if (this._counters.TryGetValueSafe(actionParameter, out var oldCounter))
            {
                var newCounter = this.FixAdjustmentValue(actionParameter, oldCounter + ticks); // ensure that value is within the allowed range

                if (newCounter != oldCounter)
                {
                    this._counters[actionParameter] = newCounter; // increase or decrease counter on the number of ticks
                    this.AdjustmentValueChanged(actionParameter, newCounter); // adjustment value has changed
                }

            }
        }

        protected override void RunCommand(String actionParameter)
        {
            if (this._counters.TryGetValueSafe(actionParameter, out var oldCounter))
            {
                var newCounter = this.GetAdjustmentDefaultValue(actionParameter).GetValueOrDefault();

                if (newCounter != oldCounter)
                {
                    this._counters[actionParameter] = newCounter; // reset adjustment value to default value
                    this.AdjustmentValueChanged(actionParameter, newCounter); // adjustment value has changed
                }
            }
        }

        protected override Double? GetAdjustmentDoubleValue(String actionParameter) => this._counters.TryGetValueSafe(actionParameter, out var value) ? value : null;

        protected override Double? GetAdjustmentMinValue(String actionParameter) => this.TryGetIndex(actionParameter, out var index) ? index * -100 : this.AdjustmentMinValue;

        protected override Double? GetAdjustmentMaxValue(String actionParameter) => this.TryGetIndex(actionParameter, out var index) ? index * 100 : this.AdjustmentMaxValue;

        protected override Double? GetAdjustmentDefaultValue(String actionParameter) => this.TryGetIndex(actionParameter, out var index) ? index : this.AdjustmentDefaultValue;

        private Boolean TryGetIndex(String actionParameter, out Int32 index) => Int32.TryParse(actionParameter, out index);
    }
}
