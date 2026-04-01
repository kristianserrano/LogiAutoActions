namespace Loupedeck.Test6Plugin
{
    // https://loupedeck.atlassian.net/browse/LDSW-8373

    public class DynamicAdjustmentWithParametersAndReset4 : PluginDynamicAdjustment
    {
        public DynamicAdjustmentWithParametersAndReset4()
            : base(false)
        {
            this.Name = DynamicAdjustmentWithParametersAndReset4Constants.Name;

            this.GroupName = DynamicAdjustmentWithParametersAndReset4Constants.GroupName;
            this.ResetGroupName = $"{DynamicAdjustmentWithParametersAndReset3Constants.GroupName}{CommonStrings.SubgroupSeparator}Reset";
        }

        protected override PluginActionParameter[] GetParameters()
        {
            var parameters = new List<PluginActionParameter>();

            for (var i = 1; i <= 3; i++)
            {
                var parameter = new PluginActionParameter(false, $"param{i}", $"Parameter D{i}", "", this.GroupName);
                parameter.ResetGroupName = this.ResetGroupName;
                parameters.Add(parameter);
            }

            return parameters.ToArray();
        }
    }

    public class ResetDynamicAdjustmentWithParametersAndReset4 : PluginDynamicCommand
    {
        public ResetDynamicAdjustmentWithParametersAndReset4()
        {
            this.Name = $"Reset{DynamicAdjustmentWithParametersAndReset4Constants.Name}";

            this.GroupName = DynamicAdjustmentWithParametersAndReset4Constants.GroupName;
        }

        protected override PluginActionParameter[] GetParameters()
        {
            var parameters = new List<PluginActionParameter>();

            for (var i = 1; i <= 3; i++)
            {
                var parameter = new PluginActionParameter(false, $"param{i}", $"Reset parameter D{i}", "", this.GroupName);
                parameters.Add(parameter);
            }

            return parameters.ToArray();
        }
    }

    internal static class DynamicAdjustmentWithParametersAndReset4Constants
    {
        public const String Name = "ParametersWithReset4Name";

        public const String GroupName = "Parameters with Reset";
    }
}