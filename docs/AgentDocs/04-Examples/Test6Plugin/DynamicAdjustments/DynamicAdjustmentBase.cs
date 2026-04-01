namespace Loupedeck.Test6Plugin
{
    using System;

    internal abstract class DynamicAdjustmentBase : PluginDynamicAdjustment
    {
        private Double _counter = 0;

        protected DynamicAdjustmentBase(Int32 index)
            : base($"Dynamic adjustment {index}", $"Dynamic adjustment {index} description", "Dynamic Adjustments", true)
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

        protected override String GetAdjustmentValue(String actionParameter) => $"{this._counter}%";
    }
}
