namespace Loupedeck.Test6Plugin
{
    // https://loupedeck.atlassian.net/browse/LDSW-8373

    public class DynamicAdjustmentWithParametersAndReset3 : PluginDynamicAdjustment
    {
        public DynamicAdjustmentWithParametersAndReset3()
            : base(false)
        {
            this.Name = DynamicAdjustmentWithParametersAndReset3Constants.Name;

            this.GroupName = DynamicAdjustmentWithParametersAndReset3Constants.GroupName;
            this.ResetGroupName = $"{DynamicAdjustmentWithParametersAndReset3Constants.GroupName}{CommonStrings.SubgroupSeparator}Reset";

            for (var i = 1; i <= 3; i++)
            {
                this.AddParameter($"param{i}", $"Parameter C{i}", this.GroupName).ResetGroupName = this.ResetGroupName;
            }
        }
    }

    public class ResetDynamicAdjustmentWithParametersAndReset3 : PluginDynamicCommand
    {
        public ResetDynamicAdjustmentWithParametersAndReset3()
        {
            this.Name = $"Reset{DynamicAdjustmentWithParametersAndReset3Constants.Name}";

            this.GroupName = DynamicAdjustmentWithParametersAndReset3Constants.GroupName;

            for (var i = 1; i <= 3; i++)
            {
                this.AddParameter($"param{i}", $"Parameter C{i}", this.GroupName);
            }
        }
    }

    internal static class DynamicAdjustmentWithParametersAndReset3Constants
    {
        public const String Name = "ParametersWithReset3Name";

        public const String GroupName = "Parameters with Reset";
    }
}