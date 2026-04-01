namespace Loupedeck.Test4Plugin
{
    using System;

    public class ActionEditorCommand4 : ActionEditorCommand
    {
        private const String MessageControlName = "message";

        public ActionEditorCommand4()
        {
            this.DisplayName = "Action Editor / Listbox";
            this.GroupName = "Action Editor";

            this.ActionEditor.AddControl(
                new ActionEditorListbox(name: MessageControlName, labelText: "Select message:"));

            this.ActionEditor.ListboxItemsRequested += this.OnActionEditorListboxItemsRequested;
        }

        protected override Boolean RunCommand(ActionEditorActionParameters actionParameters)
        {
            this.ActionEditor.ListboxItemsChanged(MessageControlName);

            return true;
        }

        private Int32 _startIndex = 1;

        private void OnActionEditorListboxItemsRequested(Object sender, ActionEditorListboxItemsRequestedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(MessageControlName))
            {
                var endIndex = this._startIndex + 5;

                for (var i = this._startIndex; i < endIndex; i++)
                {
                    e.AddItem(name: $"MESSAGE_ID_{i}", displayName: $"Example message {i}", description: null);
                }

                this._startIndex = endIndex;
            }
        }
    }
}
