namespace Loupedeck.Test4Plugin
{
    using System;

    public class ActionEditorDoubleListboxCommand : ActionEditorCommand
    {
        private const String Listbox1ControlName = "listbox1";
        private const String Listbox2ControlName = "listbox2";
        private const String ResultControlName = "result";

        public ActionEditorDoubleListboxCommand()
        {
            this.DisplayName = "Action Editor / Double Listbox";
            this.Description = "On creating a new action, (a) 'Level 1' should be automatically selected to 'Item 2'; (b) 'Level 2' should be automatically selected to 'Item 2 / 3'; (c) 'Selected' should show both selected to '2_3'.";
            this.GroupName = "Action Editor";

            this.ActionEditor.AddControl(
                new ActionEditorListbox(name: Listbox1ControlName, labelText: "Level 1:"));
            this.ActionEditor.AddControl(
                new ActionEditorListbox(name: Listbox2ControlName, labelText: "Level 2:"));
            this.ActionEditor.AddControl(
                new ActionEditorTextbox(name: ResultControlName, labelText: "Selected:"));

            this.ActionEditor.ListboxItemsRequested += this.OnActionEditorListboxItemsRequested;
            this.ActionEditor.ControlValueChanged += this.OnActionEditorControlValueChanged;
        }

        private void OnActionEditorListboxItemsRequested(Object sender, ActionEditorListboxItemsRequestedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(Listbox1ControlName))
            {
                for (var i = 1; i <= 5; i++)
                {
                    e.AddItem(name: $"{i}", displayName: $"Item {i}", description: null);
                }

                e.SetSelectedItemName(e.Items[1].Name); // select second item
            }
            else if (e.ControlName.EqualsNoCase(Listbox2ControlName))
            {
                var listbox1ControlValue = e.ActionEditorState.GetControlValue(Listbox1ControlName);

                for (var i = 1; i <= 5; i++)
                {
                    e.AddItem(name: $"{listbox1ControlValue}_{i}", displayName: $"Item {listbox1ControlValue} / {i}", description: null);
                }

                e.SetSelectedItemName(e.Items[2].Name); // select thord item
            }
        }


        private void OnActionEditorControlValueChanged(Object sender, ActionEditorControlValueChangedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(Listbox1ControlName))
            {
                this.ActionEditor.ListboxItemsChanged(Listbox2ControlName);
            }
            if (e.ControlName.EqualsNoCase(Listbox2ControlName))
            {
                var listbox2ControlValue = e.ActionEditorState.GetControlValue(Listbox2ControlName);
                e.ActionEditorState.SetValue(ResultControlName, listbox2ControlValue);
                e.ActionEditorState.SetDisplayName(listbox2ControlValue);
            }
        }
    }
}
