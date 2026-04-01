namespace Loupedeck.Test4Plugin
{
    using System;

    class PluginDynamicAdjustment1 : PluginDynamicAdjustment
    {
        private Int32 _value = 0;

        public PluginDynamicAdjustment1() : base("PluginDynamicAdjustment1", "", "Test", true)
        {
        }

        protected override void RunCommand(String actionParameter)
        {
            this._value = 0;

            this.AdjustmentValueChanged();
        }

        protected override void ApplyAdjustment(String actionParameter, Int32 diff)
        {
            this._value += diff;
            this._value = Helpers.MinMax(this._value, -100, 100);

            this.AdjustmentValueChanged();
        }

        protected override String GetAdjustmentValue(String actionParameter) => $"{this._value}";
    }
}
