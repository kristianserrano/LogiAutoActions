namespace Loupedeck.Test4Plugin.DynamicFolders
{
    using System;
    using System.Collections.Generic;

    class ActionsChangedDynamicFolder : PluginDynamicFolder
    {
        public ActionsChangedDynamicFolder()
        {
            this.DisplayName = "Actions List Changed Test";
            this.GroupName = "Control Center";
        }

        public override IEnumerable<String> GetButtonPressActionNames(DeviceType deviceType)
        {
            var actionNames = new List<String>();

            for (var i = 0; i < 30; i++)
            {
                actionNames.Add(this.CreateCommandName($"Button {i}"));
            };

            return actionNames;
        }

        public override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize) => actionParameter;

        public override IEnumerable<String> GetEncoderRotateActionNames(DeviceType deviceType)
        {
            var actionNames = new List<String>();

            for (var i = 0; i < 30; i++)
            {
                actionNames.Add(this.CreateAdjustmentName($"Encoder {i}"));
            };

            return actionNames;
        }

        public override void RunCommand(String actionParameter)
        {
            this.ButtonActionNamesChanged();
            this.EncoderActionNamesChanged();
        }
    }
}
