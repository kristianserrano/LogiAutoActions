namespace Loupedeck.Test6Plugin
{
    // https://loupedeck.atlassian.net/browse/LDSW-8372

    public class DynamicAdjustmentWithParametersAndReset1 : PluginDynamicAdjustment
    {
        public DynamicAdjustmentWithParametersAndReset1()
            : base(true)
        {
            this.GroupName = "Parameters with Reset";
            this.ResetGroupName = $"{this.GroupName}{CommonStrings.SubgroupSeparator}Reset";

            for (var i = 1; i <= 3; i++)
            {
                var parameter = this.AddParameter($"param{i}", $"Parameter A{i}", this.GroupName);
                parameter.ResetDisplayName = $"Reset Parameter A{i}";
                parameter.ResetGroupName = this.ResetGroupName;
            }
        }
    }
}