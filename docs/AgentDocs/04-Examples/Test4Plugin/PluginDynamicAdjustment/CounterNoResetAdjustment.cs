namespace Loupedeck.Test4Plugin
{
    using System;

    public class CounterNoResetAdjustment : PluginDynamicAdjustment
    {
        private Int32 _counter = 0;

        public CounterNoResetAdjustment() : base("Counter No Reset", "Counts rotation ticks", "Tools", false)
        {
        }

        protected override void ApplyAdjustment(String actionParameter, Int32 ticks)
        {
            this._counter += ticks; // increase or decrease counter on the number of ticks
            this.AdjustmentValueChanged(); // adjustment value has changed
        }

        protected override String GetAdjustmentValue(String actionParameter) => this._counter.ToString();
    }
}
