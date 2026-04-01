namespace Loupedeck.Test6Plugin
{
    using System;

    public class MultistateActionEditorCommand2 : MultistateActionEditorCommand
    {
        private const String ItemControlName = "item";

        public MultistateActionEditorCommand2()
        {
            this.DisplayName = "Multistate Action Editor / Listbox";
            this.GroupName = "Multistate Action Editor";

            this.ActionEditor.AddControl(
                new ActionEditorListbox(name: ItemControlName, labelText: "Select item:"));

            this.ActionEditor.ListboxItemsRequested += this.OnActionEditorListboxItemsRequested;

            this.AddState("State 1", "Switch to state 1");
            this.AddState("State 2", "Switch to state 2");
            this.AddState("State 3", "Switch to state 3");
        }

        protected override Boolean RunCommand(ActionEditorActionParameters actionParameters)
        {
            if (actionParameters.TryGetString(ItemControlName, out var message))
            {
                var state = this.GetCurrentState(actionParameters);

                this.Plugin.OnPluginStatusChanged(PluginStatus.Warning, $"Plugin is in '{state.DisplayName}' ({message})", null, null);

                this.IncrementCurrentState(actionParameters);
                return true;
            }

            return false;
        }

        protected override BitmapImage GetCommandImage(ActionEditorActionParameters actionParameters, Int32 stateIndex, Int32 imageWidth, Int32 imageHeight)
        {
            if (actionParameters.TryGetString(ItemControlName, out var item))
            {
                var displayName = this.States[stateIndex].DisplayName;
                var number = displayName[displayName.Length - 1];

                using (var bitmapBuilder = new BitmapBuilder(imageWidth, imageHeight))
                {
                    bitmapBuilder.DrawText($"State {number}\r\n{item}");
                    return bitmapBuilder.ToImage();
                }
            }

            return null;
        }

        private void OnActionEditorListboxItemsRequested(Object sender, ActionEditorListboxItemsRequestedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(ItemControlName))
            {
                for (var i = 1; i <= 5; i++)
                {
                    e.AddItem(name: $"Item {i}", displayName: $"Item {i}", description: null);
                }
            }
        }
    }
}
