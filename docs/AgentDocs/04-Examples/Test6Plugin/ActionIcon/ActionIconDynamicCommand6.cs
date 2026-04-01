namespace Loupedeck.Test6Plugin
{
    using System;

    internal class ActionIconDynamicCommand6 : ActionEditorCommand
    {
        private const String ControlName = "control";

        public ActionIconDynamicCommand6()
        {
            this.DisplayName = "Action Icon 6";
            this.Description = "Action Icon 6 description";
            this.GroupName = "Action Icon";

            this.ActionEditor.AddControlEx(new ActionEditorListbox(name: ControlName, labelText: "Select icon:"));

            this.ActionEditor.ListboxItemsRequested += this.OnActionEditorListboxItemsRequested;
        }

        private void OnActionEditorListboxItemsRequested(Object sender, ActionEditorListboxItemsRequestedEventArgs e)
        {
            if (e.ControlName.EqualsNoCase(ControlName))
            {
                e.AddItem(name: "icon", displayName: $"Action Icon 6", description: $"Action Icon 6 description");
                e.SetSelectedItemName(e.Items[0].Name);
            }
        }

        protected override BitmapImage GetCommandImage(ActionEditorActionParameters actionParameters, Int32 imageWidth, Int32 imageHeight)
            => BitmapImage.FromResource(this.Plugin.Assembly, "Loupedeck.Test6Plugin.ActionIcon.ActionIconDynamicCommand6.svg");
    }
}