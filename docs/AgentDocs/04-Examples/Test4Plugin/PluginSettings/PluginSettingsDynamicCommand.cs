namespace Loupedeck.Test4Plugin
{
    using System;

    public class PluginSettingsDynamicCommand : PluginDynamicCommand
    {
        private const String SettingName = "TestSetting";

        public PluginSettingsDynamicCommand()
        {
            foreach (var param in new[] { "A", "B", "C" })
            {
                this.AddParameter(param, $"Setting {param}", "Plugin Settings");
            }
        }

        protected override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize)
        {
            var displayName = $"Setting {actionParameter}";
            
            if (this.Plugin.TryGetPluginSetting(SettingName, out var currentSetting) && currentSetting.EqualsNoCase(actionParameter))
            {
                displayName += " (*)";
            }
            
            return displayName;
        }

        protected override void RunCommand(String actionParameter)
        {
            this.Plugin.SetPluginSetting(SettingName, actionParameter);
            this.ActionImageChanged();
        }
    }
}
