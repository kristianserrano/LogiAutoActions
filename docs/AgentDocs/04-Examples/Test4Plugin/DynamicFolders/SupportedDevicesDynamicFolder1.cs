namespace Loupedeck.Test4Plugin
{
    using System;
    using System.Collections.Generic;

    public class SupportedDevicesDynamicFolder1 : PluginDynamicFolder
    {
        public SupportedDevicesDynamicFolder1()
        {
            this.DisplayName = "Live not supported";
            this.UnsupportedDevices = DeviceType.Loupedeck30;
        }

        public override IEnumerable<String> GetButtonPressActionNames(DeviceType _)
        {
            return new[]
            {
                PluginDynamicFolder.NavigateUpActionName,
                this.CreateCommandName("TEST"),
            };
        }

        public override String GetCommandDisplayName(String commandParameter, PluginImageSize imageSize) => "Not Live";
    }
}
