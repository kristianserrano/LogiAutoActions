namespace Loupedeck.Test6Plugin
{
    internal class MinMaxParamsDynamicAdjustment : PluginDynamicAdjustment
    {
        private readonly Dictionary<String, Int32> _values = new();

        public MinMaxParamsDynamicAdjustment()
            : base(true)
        {
            this.GroupName = "Test";

            for (var i = 0; i < 3; i++)
            {
                var actionParameter = $"{i}";
                var parameter = this.AddParameter(actionParameter, $"MinMax {i + 1}", this.GroupName, 0, 5, 10);

                this._values[actionParameter] = 5;
            }
        }

        protected override void ApplyAdjustment(String actionParameter, Int32 ticks)
        {
            if (this._values.TryGetValue(actionParameter, out var oldValue) && this.TryGetAdjustmentParameter(actionParameter, out var parameter))
            {
                var newValue = Helpers.MinMax(oldValue + ticks, (Int32)parameter.AdjustmentMinValue, (Int32)parameter.AdjustmentMaxValue);

                if (newValue != oldValue)
                {
                    this._values[actionParameter] = newValue;
                    this.AdjustmentValueChanged(actionParameter, newValue);
                }
            }
        }

        protected override void RunCommand(String actionParameter)
        {
            if (this._values.TryGetValue(actionParameter, out var oldValue) && this.TryGetAdjustmentParameter(actionParameter, out var parameter))
            {
                var newValue = (Int32)parameter.AdjustmentDefaultValue;

                if (newValue != oldValue)
                {
                    this._values[actionParameter] = newValue;
                    this.AdjustmentValueChanged(actionParameter, newValue);
                }
            }
        }

        protected override PluginAdjustmentValue GetAdjustmentValueData(String actionParameter)
            => this._values.TryGetValue(actionParameter, out var adjustmentCurrentValue) ? this.CreateAdjustmentValue(actionParameter, adjustmentCurrentValue) : null;
    }
}