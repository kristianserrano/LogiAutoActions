namespace Loupedeck.Test4Plugin
{
    using System;

    public class ActionEditorImageChangedCommand1 : ActionEditorCommand
    {
        private const String ItemControlName = "item";

        private readonly Boolean[] _itemStates = new Boolean[3];

        public ActionEditorImageChangedCommand1()
        {
            this.DisplayName = "Action Editor / Image Changed (1)";
            this.GroupName = "Action Editor";

            this.ActionEditor.AddControl(
                new ActionEditorListbox(name: ItemControlName, labelText: "Select item:"));

            this.ActionEditor.ListboxItemsRequested += this.OnActionEditorListboxItemsRequested;
        }

        protected override String GetCommandDisplayName(ActionEditorActionParameters actionParameters)
            => this.TryGetItemIndex(actionParameters, out var index) ? $"Item {index}:\n{this._itemStates[index]}" : "ERROR";

        protected override Boolean RunCommand(ActionEditorActionParameters actionParameters)
        {
            if (this.TryGetItemIndex(actionParameters, out var index))
            {
                this._itemStates[index] = !this._itemStates[index];
                this.ActionImageChanged();
                return true;
            }

            return false;
        }

        private void OnActionEditorListboxItemsRequested(Object sender, ActionEditorListboxItemsRequestedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(ItemControlName))
            {
                for (var i = 0; i < this._itemStates.Length; i++)
                {
                    e.AddItem(name: i.ToString(), displayName: $"Item {i}", description: null);
                }
            }
        }

        private Boolean TryGetItemIndex(ActionEditorActionParameters actionParameters, out Int32 index)
        {
            index = default;
            return actionParameters.TryGetString(ItemControlName, out var item) && Int32.TryParse(item, out index) && (index >= 0) && (index < this._itemStates.Length);
        }
    }
}
