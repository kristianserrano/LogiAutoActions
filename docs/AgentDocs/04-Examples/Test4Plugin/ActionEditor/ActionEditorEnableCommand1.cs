namespace Loupedeck.Test4Plugin
{
    using System;

    public class ActionEditorEnableCommand1 : ActionEditorCommand
    {
        private const String IsEnabledControlName = "isEnabled";
        private const String TestControlName = "test";

        public ActionEditorEnableCommand1()
        {
            this.DisplayName = "Action Editor / Enabled by default";
            this.GroupName = "Action Editor";

            this.ActionEditor.AddControl(
                new ActionEditorListbox(name: IsEnabledControlName, labelText: "Select state:"));

            this.ActionEditor.AddControl(
                new ActionEditorTextbox(name: TestControlName, labelText: "Type anything:"));

            this.ActionEditor.ListboxItemsRequested += this.OnActionEditorListboxItemsRequested;
            this.ActionEditor.ControlValueChanged += this.OnActionEditorControlValueChanged;
        }

        private void OnActionEditorListboxItemsRequested(Object sender, ActionEditorListboxItemsRequestedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(IsEnabledControlName))
            {
                e.AddItem(name: "enabled", displayName: $"Textbox enabled", description: null);
                e.AddItem(name: "disabled", displayName: $"Textbox disabled", description: null);
            }
        }

        private void OnActionEditorControlValueChanged(Object sender, ActionEditorControlValueChangedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(IsEnabledControlName))
            {
                var isEnabled = !e.ActionEditorState.GetControlValue(IsEnabledControlName).EqualsNoCase("disabled");
                e.ActionEditorState.SetEnabled(TestControlName, isEnabled);
            }
        }
    }
}
