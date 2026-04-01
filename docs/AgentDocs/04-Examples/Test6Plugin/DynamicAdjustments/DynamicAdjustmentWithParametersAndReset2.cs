namespace Loupedeck.Test6Plugin
{
    using System;

    // https://loupedeck.atlassian.net/browse/LDSW-8372

    public class DynamicAdjustmentWithParametersAndReset2 : PluginDynamicAdjustment
    {
        public DynamicAdjustmentWithParametersAndReset2()
            : base(true)
        {
            this.GroupName = "Parameters with Reset";
            this.ResetGroupName = $"{this.GroupName}{CommonStrings.SubgroupSeparator}Reset";
        }

        protected override PluginActionParameter[] GetParameters()
        {
            var parameters = new List<PluginActionParameter>();

            for (var i = 1; i <= 3; i++)
            {
                var parameter = new PluginActionParameter(false, $"param{i}", $"Parameter B{i}", "", this.GroupName)
                {
                    ResetDisplayName = $"Reset Parameter B{i}",
                    ResetGroupName = this.ResetGroupName,
                };

                parameters.Add(parameter);
            }

            return parameters.ToArray();
        }
    }
}