namespace Loupedeck.Test4Plugin
{
    using System;

    public class ActionEditorHiddenCommand : ActionEditorCommand
    {
        private const String ListboxControlName = "listbox";
        private const String Checkbox1ControlName = "checkbox1";
        private const String Checkbox2ControlName = "checkbox2";
        private const String TextboxControlName = "textbox";
        private const String HiddenControlName = "hidden";

        public ActionEditorHiddenCommand()
        {
            this.DisplayName = "Action Editor / Hidden control";
            this.GroupName = "Action Editor";

            this.ActionEditor.AddControl(
                new ActionEditorListbox(name: ListboxControlName, labelText: "1. Select state:"));
            this.ActionEditor.AddControl(
                new ActionEditorCheckbox(name: Checkbox1ControlName, labelText: "2. Click to update hidden from listbox"));
            this.ActionEditor.AddControl(
                new ActionEditorHidden(name: HiddenControlName));
            this.ActionEditor.AddControl(
                new ActionEditorCheckbox(name: Checkbox2ControlName, labelText: "3. Click to update textbox from hidden"));
            this.ActionEditor.AddControl(
                new ActionEditorTextbox(name: TextboxControlName, labelText: "Result:"));

            this.ActionEditor.ListboxItemsRequested += this.OnActionEditorListboxItemsRequested;
            this.ActionEditor.ControlValueChanged += this.OnActionEditorControlValueChanged;
        }

        private void OnActionEditorListboxItemsRequested(Object sender, ActionEditorListboxItemsRequestedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(ListboxControlName))
            {
                for (var i = 1; i <= 5; i++)
                {
                    var name = $"Item {i}";
                    e.AddItem(name: name, displayName: name, description: null);
                }
            }
        }

        private void OnActionEditorControlValueChanged(Object sender, ActionEditorControlValueChangedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(Checkbox1ControlName))
            {
                var value = e.ActionEditorState.GetControlValue(ListboxControlName);
                e.ActionEditorState.SetValue(HiddenControlName, value);
            }
            else if (e.ControlName.EqualsNoCase(Checkbox2ControlName))
            {
                var value = e.ActionEditorState.GetControlValue(HiddenControlName);
                e.ActionEditorState.SetValue(TextboxControlName, value);
            }
        }
    }
}
