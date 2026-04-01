namespace Loupedeck.Test4Plugin
{
    using System;

    public class ActionEditorCommand5 : ActionEditorCommand
    {
        private const String IndexControlName = "index";
        private const String IndexChangerControlName = "indexChanger";

        private const Int32 IndexCount = 3;
        private readonly Int32[] _counters = new Int32[IndexCount];

        public ActionEditorCommand5()
        {
            this.DisplayName = "Action Editor / Button";
            this.GroupName = "Action Editor";

            this.ActionEditor.AddControl(
                new ActionEditorHidden(name: IndexControlName));
            this.ActionEditor.AddControl(
                new ActionEditorButton(name: IndexChangerControlName, labelText: "Click to start"));

            this.ActionEditor.ControlValueChanged += this.OnActionEditorControlValueChanged;
        }

        private void OnActionEditorControlValueChanged(Object sender, ActionEditorControlValueChangedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(IndexChangerControlName))
            {
                var indexString = e.ActionEditorState.GetControlValue(IndexControlName);
                var index = String.IsNullOrEmpty(indexString) || !Int32.TryParse(indexString, out var tempIndex) || (tempIndex < 0) || (tempIndex >= IndexCount) ? -1 : tempIndex;

                index++;
                if (index >= IndexCount)
                {
                    index = 0;
                }

                e.ActionEditorState.SetValue(IndexControlName, index.ToString());
                e.ActionEditorState.SetLabelText(IndexChangerControlName, $"Click to change {index}");
                e.ActionEditorState.SetDisplayName($"# {index} - click to change");
            }
        }

        protected override String GetCommandDisplayName(ActionEditorActionParameters actionParameters)
            => actionParameters.TryGetInt32(IndexControlName, out var index) ? $"# {index} is {this._counters[index]}" : "ERROR";

        protected override Boolean ProcessButtonEvent2(ActionEditorActionParameters actionParameters, DeviceButtonEvent2 buttonEvent)
        {
            if (!this.TryGetIndex(actionParameters, out var index))
            {
                return false;
            }

            switch (buttonEvent.EventType)
            {
                case DeviceButtonEventType.Press:
                    this._counters[index]++;
                    this.ActionImageChanged();
                    break;
                case DeviceButtonEventType.LongPress:
                    this._counters[index] = 0;
                    this.ActionImageChanged();
                    break;
            }

            return true;
        }

        protected override Boolean ProcessTouchEvent(ActionEditorActionParameters actionParameters, DeviceTouchEvent touchEvent)
        {
            if (!this.TryGetIndex(actionParameters, out var index))
            {
                return false;
            }

            switch (touchEvent.EventType)
            {
                case DeviceTouchEventType.Press:
                    this._counters[index]++;
                    this.ActionImageChanged();
                    break;
                case DeviceTouchEventType.LongPress:
                    this._counters[index] = 0;
                    this.ActionImageChanged();
                    break;
            }

            return true;
        }

        private Boolean TryGetIndex(ActionEditorActionParameters actionParameters, out Int32 index) => actionParameters.TryGetInt32(IndexControlName, out index);
    }
}
