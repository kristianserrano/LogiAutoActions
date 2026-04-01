namespace Loupedeck.Test6Plugin
{
    using System;

    public class HiddenDynamicAdjustmentWithParameters : PluginDynamicAdjustment
    {
        public HiddenDynamicAdjustmentWithParameters()
            : base(true)
        {
            this.DisplayName = "Hidden";
            this.GroupName = HiddenDynamicAdjustmentToggleDynamicCommand.GroupNameAdjustment;
            this.ResetDisplayName = "Hidden Reset";
            this.ResetGroupName = HiddenDynamicAdjustmentToggleDynamicCommand.GroupNameResetCommand;

            for (var i = 1; i <= 3; i++)
            {
                var parameterName = $"param{i}";
                var parameter = this.AddParameter(parameterName, $"{this.DisplayName} {i}", this.GroupName);
                parameter.ResetDisplayName = $"{this.ResetDisplayName} {i}";
                parameter.ResetGroupName = this.ResetGroupName;
            }

            this.SetHidden();
        }
    }
}