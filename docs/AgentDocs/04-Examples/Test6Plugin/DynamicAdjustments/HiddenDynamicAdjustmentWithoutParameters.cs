namespace Loupedeck.Test6Plugin
{
    using System;

    public class HiddenDynamicAdjustmentWithoutParameters : PluginDynamicAdjustment
    {
        public HiddenDynamicAdjustmentWithoutParameters()
            : base("Hidden", "", HiddenDynamicAdjustmentToggleDynamicCommand.GroupNameAdjustment, true)
        {
            this.ResetDisplayName = "Hidden Reset";
            this.ResetGroupName = HiddenDynamicAdjustmentToggleDynamicCommand.GroupNameResetCommand;

            this.SetHidden();
        }
    }
}