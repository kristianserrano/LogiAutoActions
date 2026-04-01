namespace Loupedeck.Test4Plugin
{
    using System;

    public class ActionEditorVisibleCommand1 : ActionEditorCommand
    {
        private const String IsVisibleControlName = "isVisible";
        private const String TestControlName = "test";

        public ActionEditorVisibleCommand1()
        {
            this.DisplayName = "Action Editor / Visible by default";
            this.GroupName = "Action Editor";

            this.ActionEditor.AddControl(
                new ActionEditorListbox(name: IsVisibleControlName, labelText: "Select state:"));

            this.ActionEditor.AddControl(
                new ActionEditorTextbox(name: TestControlName, labelText: "Type anything:"));

            this.ActionEditor.ListboxItemsRequested += this.OnActionEditorListboxItemsRequested;
            this.ActionEditor.ControlValueChanged += this.OnActionEditorControlValueChanged;
        }

        private void OnActionEditorListboxItemsRequested(Object sender, ActionEditorListboxItemsRequestedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(IsVisibleControlName))
            {
                e.AddItem(name: "visible", displayName: $"Textbox visible", description: null);
                e.AddItem(name: "hidden", displayName: $"Textbox hidden", description: null);
            }
        }

        private void OnActionEditorControlValueChanged(Object sender, ActionEditorControlValueChangedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(IsVisibleControlName))
            {
                var isEnabled = !e.ActionEditorState.GetControlValue(IsVisibleControlName).EqualsNoCase("hidden");
                e.ActionEditorState.SetVisibility(TestControlName, isEnabled);
            }
        }
    }
}
