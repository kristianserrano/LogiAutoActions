namespace Loupedeck.Test6Plugin
{
    using System;

    internal class AdjustmentNoValueWithEventDynamicAdjustment : PluginDynamicAdjustment
    {
        public AdjustmentNoValueWithEventDynamicAdjustment()
            : base("Adjustment No Value (with event)", "Adjustment No Value description", "Adjustment Value", false)
        {
        }

        protected override void ApplyAdjustment(String actionParameter, Int32 ticks) => this.AdjustmentValueChanged(); // adjustment value has changed
    }
}