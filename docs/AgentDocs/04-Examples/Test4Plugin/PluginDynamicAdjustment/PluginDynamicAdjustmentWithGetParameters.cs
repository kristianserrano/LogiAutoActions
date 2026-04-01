namespace Loupedeck.Test4Plugin
{
    using System;
    using System.Collections.Generic;

    public class PluginDynamicAdjustmentWithGetParameters : PluginDynamicAdjustment
    {
        public PluginDynamicAdjustmentWithGetParameters()
            : base(false)
        {
        }

        protected override PluginActionParameter[] GetParameters()
        {
            var parameters = new List<PluginActionParameter>();

            for (var i = 0; i < 5; i++)
            {
                parameters.Add(new PluginActionParameter($"parameter{i}", $"Parameter {i}", "PluginDynamicAdjustmentWithGetParameters"));
            }

            return parameters.ToArray();
        }
    }
}