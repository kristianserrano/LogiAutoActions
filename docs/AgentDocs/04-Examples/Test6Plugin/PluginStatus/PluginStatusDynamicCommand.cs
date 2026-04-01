namespace Loupedeck.Test6Plugin
{
    using System;

    public class PluginStatusDynamicCommand : PluginDynamicCommand
    {
        public PluginStatusDynamicCommand()
        {
            foreach (var param in EnumExtensions.GetEnumValues<PluginStatus>())
            {
                this.AddParameter(param.ToString(), param.ToString(), "Plugin Status");
            }
        }

        protected override void RunCommand(String actionParameter)
        {
            if (actionParameter.TryGetEnumValue<PluginStatus>(out var pluginStatus))
            {
                this.Plugin.OnPluginStatusChanged(pluginStatus, $"Plugin status changed to {pluginStatus}");
            }
        }
    }
}
