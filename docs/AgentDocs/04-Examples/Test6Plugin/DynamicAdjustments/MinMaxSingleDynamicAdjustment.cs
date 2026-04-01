namespace Loupedeck.Test6Plugin
{
    internal class MinMaxSingleDynamicAdjustment : PluginDynamicAdjustment
    {
        private Int32 _value;

        public MinMaxSingleDynamicAdjustment()
            : base("Min/max", "A dummy adjustment with min and max values", "Test", false)
        {
            this.AdjustmentMinValue = -10;
            this.AdjustmentMaxValue = 10;
        }

        protected override void ApplyAdjustment(String actionParameter, Int32 ticks)
        {
            var newValue = Helpers.MinMax(this._value + ticks, (Int32)this.AdjustmentMinValue, (Int32)this.AdjustmentMaxValue);

            if (newValue != this._value)
            {
                this._value = newValue;
                this.AdjustmentValueChanged(actionParameter, newValue);
            }
        }

        protected override String GetAdjustmentValue(String actionParameter) => this._value.ToString();
    }
}