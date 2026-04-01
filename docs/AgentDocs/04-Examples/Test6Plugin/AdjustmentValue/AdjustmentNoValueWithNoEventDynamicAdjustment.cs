namespace Loupedeck.Test6Plugin
{
    using System;

    internal class AdjustmentNoValueWithNoEventDynamicAdjustment : PluginDynamicAdjustment
    {
        public AdjustmentNoValueWithNoEventDynamicAdjustment()
            : base("Adjustment No Value (with no event)", "Adjustment No Value description", "Adjustment Value", false)
        {
        }

        protected override void ApplyAdjustment(String actionParameter, Int32 ticks)
        {
        }
    }
}