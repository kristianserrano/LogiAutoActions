namespace Loupedeck.Test6Plugin
{
    using System;

    internal class AdjustmentValueDynamicAdjustment1 : PluginDynamicAdjustment
    {
        private Double _counter = 0;

        public AdjustmentValueDynamicAdjustment1()
            : base("Adjustment Value 1", "Adjustment Value 1 description", "Adjustment Value", true)
        {
            this.AdjustmentMinValue = -100; // minimum value
            this.AdjustmentMaxValue = 100; // maximum value
            this.AdjustmentDefaultValue = 0; // default value
        }

        protected override void ApplyAdjustment(String actionParameter, Int32 ticks)
        {
            // increase or decrease counter on the number of ticks
            var newCounter = this.FixAdjustmentValue(this._counter + ticks);

            if (newCounter != this._counter)
            {
                this._counter = newCounter;
                this.AdjustmentValueChanged(this._counter); // adjustment value has changed
            }
        }

        protected override void RunCommand(String actionParameter)
        {
            this._counter = 0; // reset counter to 0
            this.AdjustmentValueChanged(this._counter); // adjustment value has changed
        }

        protected override Double? GetAdjustmentDoubleValue(String actionParameter) => this._counter;
    }
}
