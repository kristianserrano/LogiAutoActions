namespace Loupedeck.Test4Plugin
{
    using System;
    using System.Collections.Generic;

    public class TestDynamicFolder : PluginDynamicFolder
    {
        private String _event1 = "";
        private String _event2 = "";

        public TestDynamicFolder()
        {
            this.DisplayName = "Test Control Center";
        }

        public override IEnumerable<String> GetButtonPressActionNames()
        {
            return new[]
            {
                // row 1
                PluginDynamicFolder.NavigateUpActionName,
                this.CreateCommandName("TEST1"),
                this.CreateCommandName(""),
                this.CreateCommandName(""),
                // row 2
                this.CreateCommandName(""),
                this.CreateCommandName(""),
                this.CreateCommandName(""),
                this.CreateCommandName(""),
                // row 3
                this.CreateCommandName("EVENT1"),
                this.CreateCommandName(""),
                this.CreateCommandName("EVENT2"),
                this.CreateCommandName("TEST2"),
            };
        }

        public override IEnumerable<String> GetEncoderPressActionNames()
        {
            return new[]
            {
                this.CreateCommandName(""),
                this.CreateCommandName(""),
                this.CreateCommandName("TEST1"),
                this.CreateCommandName(""),
                this.CreateCommandName(""),
                this.CreateCommandName("")
            };
        }

        public override String GetCommandDisplayName(String commandParameter, PluginImageSize imageSize)
        {
            switch (commandParameter)
            {
                case "TEST1":
                    return "BUTTON";
                case "EVENT1":
                    return this._event1;
                case "TEST2":
                    return "TOUCH";
                case "EVENT2":
                    return this._event2;
                default:
                    return "";
            }
        }

        public override Boolean ProcessButtonEvent(String actionParameter, DeviceButtonEvent buttonEvent)
        {
            if (!actionParameter.EqualsNoCase("TEST1"))
            {
                return false;
            }

            Tracer.Trace($"BUTTON={buttonEvent.IsPressed}/{buttonEvent.IsLongPress}");

            if (!buttonEvent.IsPressed)
            {
                this._event1 = "RELEASED";
            }
            else if (buttonEvent.IsLongPress)
            {
                this._event1 = "LONG";
            }
            else
            {
                this._event1 = "PRESSED";
            }

            this.CommandImageChanged("EVENT1");
            return true;
        }

        public override Boolean ProcessTouchEvent(String actionParameter, DeviceTouchEvent touchEvent)
        {
            if (!actionParameter.EqualsNoCase("TEST2"))
            {
                return false;
            }

            Tracer.Trace($"TOUCH={touchEvent.EventType}");

            this._event2 = touchEvent.EventType.ToString().ToUpper();

            this.CommandImageChanged("EVENT2");
            return true;
        }
    }
}
