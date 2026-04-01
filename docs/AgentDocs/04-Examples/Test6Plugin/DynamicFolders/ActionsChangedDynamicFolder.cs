namespace Loupedeck.Test6Plugin
{
    using System;
    using System.Collections.Generic;

    class ActionsChangedDynamicFolder : PluginDynamicFolder
    {
        private const Int32 ControlCount = 20;
        private Int32 _delta = 0;

        public ActionsChangedDynamicFolder()
        {
            this.DisplayName = "Actions List Changed";
            this.GroupName = "Control Center";
        }

        public override IEnumerable<String> GetButtonPressActionNames(DeviceType deviceType)
        {
            var actionNames = new List<String>();

            var k = this._delta;
            for (var i = 0; i < 30; i++)
            {
                actionNames.Add(this.CreateCommandName($"Button {k}"));
                k++;
            };

            return actionNames;
        }

        public override String GetCommandDisplayName(String actionParameter, PluginImageSize imageSize) => actionParameter;

        public override IEnumerable<String> GetEncoderRotateActionNames(DeviceType deviceType)
        {
            var actionNames = new List<String>();

            var k = this._delta;
            for (var i = 0; i < 30; i++)
            {
                actionNames.Add(this.CreateAdjustmentName($"Encoder {k}"));
                k++;
            };

            return actionNames;
        }

        public override void RunCommand(String actionParameter)
        {
            this._delta++;

            this.ButtonActionNamesChanged();
            this.EncoderActionNamesChanged();
        }
    }
}
