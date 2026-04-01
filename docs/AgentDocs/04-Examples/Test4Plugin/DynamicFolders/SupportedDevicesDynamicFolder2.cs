namespace Loupedeck.Test4Plugin
{
    using System;
    using System.Collections.Generic;

    public class SupportedDevicesDynamicFolder2 : PluginDynamicFolder
    {
        public SupportedDevicesDynamicFolder2()
        {
            this.DisplayName = "LiveS only supported";
            this.SupportedDevices = DeviceType.Loupedeck50;
        }

        public override IEnumerable<String> GetButtonPressActionNames(DeviceType _)
        {
            return new[]
            {
                PluginDynamicFolder.NavigateUpActionName,
                this.CreateCommandName("TEST"),
            };
        }

        public override String GetCommandDisplayName(String commandParameter, PluginImageSize imageSize) => "LiveS only";
    }
}
